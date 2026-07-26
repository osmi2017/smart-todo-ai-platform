from rest_framework import serializers
from .models import Mission, MissionMember, User, Project, Task, Milestone


class MissionMemberSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.username', read_only=True)
    user_email = serializers.EmailField(source='user.email', read_only=True)

    class Meta:
        model = MissionMember
        fields = ['id', 'user', 'user_name', 'user_email', 'is_leader', 'joined_at']
        read_only_fields = ['id', 'joined_at']


class MissionProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = ['id', 'name', 'status', 'color', 'progress']


class MissionTaskSerializer(serializers.ModelSerializer):
    assigned_to_name = serializers.CharField(source='assigned_to.username', read_only=True, default='')

    class Meta:
        model = Task
        fields = ['id', 'title', 'status', 'priority', 'assigned_to_name']


class MissionMilestoneSerializer(serializers.ModelSerializer):
    class Meta:
        model = Milestone
        fields = ['id', 'name', 'status', 'due_date', 'progress']


class MissionSerializer(serializers.ModelSerializer):
    members = MissionMemberSerializer(many=True, read_only=True)
    member_ids = serializers.PrimaryKeyRelatedField(
        many=True, queryset=User.objects.all(), write_only=True,
        source='members_data', required=False
    )
    leader_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), write_only=True,
        source='leader_data', required=False, allow_null=True
    )
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    total_cost = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    frais_de_mission = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    duration_days = serializers.SerializerMethodField()

    project_detail = MissionProjectSerializer(source='project', read_only=True)
    tasks_detail = MissionTaskSerializer(source='tasks', many=True, read_only=True)
    milestones_detail = MissionMilestoneSerializer(source='milestones', many=True, read_only=True)

    class Meta:
        model = Mission
        fields = [
            'id', 'title', 'description', 'status',
            'destination_name', 'destination_lat', 'destination_lng',
            'start_date', 'end_date',
            'cost_per_diem', 'cost_accommodation', 'cost_transport', 'cost_other',
            'currency', 'total_cost', 'frais_de_mission', 'created_by', 'created_by_name',
            'expense_report', 'mission_report',
            'members', 'member_ids', 'leader_id',
            'project', 'project_detail',
            'tasks', 'tasks_detail',
            'milestones', 'milestones_detail',
            'duration_days', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at', 'total_cost', 'frais_de_mission']

    def get_duration_days(self, obj):
        if obj.start_date and obj.end_date:
            return (obj.end_date - obj.start_date).days + 1
        return None

    def create(self, validated_data):
        members_data = validated_data.pop('members_data', [])
        leader_data = validated_data.pop('leader_data', None)
        task_ids = validated_data.pop('tasks', [])
        milestone_ids = validated_data.pop('milestones', [])

        mission = Mission.objects.create(**validated_data)

        if task_ids:
            mission.tasks.set(task_ids)
        if milestone_ids:
            mission.milestones.set(milestone_ids)

        if leader_data:
            MissionMember.objects.create(
                mission=mission, user=leader_data, is_leader=True
            )
            if leader_data not in members_data:
                members_data.append(leader_data)

        for user in members_data:
            if not mission.members.filter(user=user).exists():
                is_leader = leader_data and user.id == leader_data.id
                MissionMember.objects.create(
                    mission=mission, user=user, is_leader=is_leader
                )

        return mission

    def update(self, instance, validated_data):
        members_data = validated_data.pop('members_data', None)
        leader_data = validated_data.pop('leader_data', None)
        task_ids = validated_data.pop('tasks', None)
        milestone_ids = validated_data.pop('milestones', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if task_ids is not None:
            instance.tasks.set(task_ids)
        if milestone_ids is not None:
            instance.milestones.set(milestone_ids)

        if leader_data:
            instance.members.update(is_leader=False)
            member, _ = MissionMember.objects.get_or_create(
                mission=instance, user=leader_data
            )
            member.is_leader = True
            member.save()

        if members_data is not None:
            existing = {m.user_id: m for m in instance.members.all()}
            new_ids = [u.id for u in members_data]
            for uid, member in existing.items():
                if uid not in new_ids:
                    member.delete()
            for user in members_data:
                if user.id not in existing:
                    is_leader = leader_data and user.id == leader_data.id
                    MissionMember.objects.create(
                        mission=instance, user=user, is_leader=is_leader
                    )

        return instance


class MissionDetailSerializer(MissionSerializer):
    members = MissionMemberSerializer(many=True, read_only=True)
