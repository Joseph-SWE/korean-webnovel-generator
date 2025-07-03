const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function initDemo() {
  try {
    console.log('🚀 Initializing demo data for Korean Web Novel Generator...');

    // Create demo user
    const demoUser = await prisma.user.upsert({
      where: { id: 'demo-user-id' },
      update: {},
      create: {
        id: 'demo-user-id',
        username: 'demo_writer',
        email: 'demo@korean-webnovel.com',
      },
    });

    console.log('✅ Demo user created:', demoUser.username);

    // Create sample novel
    let sampleNovel = await prisma.novel.findFirst({
      where: { 
        authorId: 'demo-user-id',
        title: 'The Regression of a Villainess'
      }
    });

    if (!sampleNovel) {
      sampleNovel = await prisma.novel.create({
        data: {
          title: 'The Regression of a Villainess',
          description: 'Lady Aria Blackwood thought her life was over when she was executed for her crimes. But when she opens her eyes, she\'s back to being 16 years old - the day before she first met the crown prince. This time, she\'ll rewrite her destiny.',
          genre: 'VILLAINESS',
          setting: 'ROYAL_COURT',
          authorId: 'demo-user-id',
        },
      });
    }

    console.log('✅ Sample novel created:', sampleNovel.title);

    // Create sample characters
    const characters = [
      {
        name: '한서연',
        description: '회귀한 악역 영애. 과거의 실수를 바로잡고 운명을 바꾸려 한다.',
        personality: '똑똑하고 의지가 강함. 처음엔 냉소적이지만 점차 따뜻해짐',
        background: '한국 최고 재벌가의 외동딸. 전생에서 황태자와 여주인공에게 밀려 몰락',
        relationships: JSON.stringify({
          '이준혁': '전생의 원수, 이번 생의 공략 대상',
          '한회장': '아버지, 복잡한 관계',
          '민지아': '전생의 라이벌, 이번엔 친구가 되고 싶다'
        }),
        novelId: sampleNovel.id,
      },
      {
        name: '이준혁',
        description: '차가운 황태자. 전생에서 서연의 처형을 명령했다.',
        personality: '냉정하고 똑똑하지만 속으론 외로움. 정의감이 강함',
        background: '대한민국 황실의 첫째 왕자. 군사적 재능과 정치적 수완으로 유명',
        relationships: JSON.stringify({
          '한서연': '복잡한 감정, 점차 끌림을 느낌',
          '황제': '아버지, 높은 기대감',
          '김비서': '측근이자 호위무사'
        }),
        novelId: sampleNovel.id,
      },
      {
        name: '민지아',
        description: '원작의 여주인공. 착하고 순수한 평민 출신 소녀.',
        personality: '온화하고 배려심 많음. 중요한 순간엔 의외로 강함',
        background: '평범한 가정의 딸. 뛰어난 재능으로 황실 아카데미에 특례 입학',
        relationships: JSON.stringify({
          '한서연': '전생의 라이벌, 이번엔 친구 관계로 발전',
          '이준혁': '일방적 호감',
          '박선우': '소꿉친구이자 잠재적 연인'
        }),
        novelId: sampleNovel.id,
      }
    ];

    for (const character of characters) {
      const existing = await prisma.character.findFirst({
        where: {
          name: character.name,
          novelId: character.novelId
        }
      });
      
      if (!existing) {
        await prisma.character.create({
          data: character,
        });
      }
    }

    console.log('✅ Sample characters created');

    // Create sample plotlines
    const plotlines = [
      {
        name: '처형 피하기',
        description: '서연이 전생에서 처형당한 원인이 되었던 실수들을 피해야 한다',
        status: 'DEVELOPING',
        priority: 1,
        novelId: sampleNovel.id,
      },
      {
        name: '황태자의 신뢰 얻기',
        description: '이준혁과 적대관계가 아닌 우호적인 관계를 구축해야 한다',
        status: 'DEVELOPING',
        priority: 2,
        novelId: sampleNovel.id,
      },
      {
        name: '진짜 흑막 찾기',
        description: '서연을 몰락시킨 진짜 배후 세력을 찾아내야 한다',
        status: 'PLANNED',
        priority: 3,
        novelId: sampleNovel.id,
      }
    ];

    for (const plotline of plotlines) {
      const existing = await prisma.plotline.findFirst({
        where: {
          name: plotline.name,
          novelId: plotline.novelId
        }
      });
      
      if (!existing) {
        await prisma.plotline.create({
          data: plotline,
        });
      }
    }

    console.log('✅ Sample plotlines created');

    // Create world building
    await prisma.worldBuilding.upsert({
      where: { novelId: sampleNovel.id },
      update: {},
      create: {
        novelId: sampleNovel.id,
        magicSystem: JSON.stringify({
          type: '황실 이능력',
          description: '재벌가와 황실 혈통에 따라 특별한 능력을 가짐',
          rules: ['능력은 유전됨', '감정이 강할수록 능력이 강화됨', '황실 혈통이 가장 강력한 능력 보유']
        }),
        locations: JSON.stringify([
          '경복궁 (황실)',
          '한서연 저택',
          '민지아네 집',
          '황실 아카데미',
          '청와대 대성당'
        ]),
        cultures: JSON.stringify({
          nobility: '엄격한 계급제도, 명예중심 사회, 정략결혼이 일반적',
          abilities: '이능력자들이 존경받음, 궁정 마법사들의 높은 지위',
          politics: '재벌가와 황실 간의 복잡한 동맹과 경쟁 관계'
        }),
        rules: JSON.stringify({
          '궁중 예법': '궁정에서는 엄격한 예의를 지켜야 함',
          '이능력 사용': '이능력으로 황실에 직접적 해를 끼칠 수 없음',
          '계승법': '성별 관계없이 첫째가 계승함'
        })
      },
    });

    console.log('✅ World building created');

    // Create a sample chapter
    const sampleChapter = await prisma.chapter.upsert({
      where: {
        novelId_number: {
          novelId: sampleNovel.id,
          number: 1
        }
      },
      update: {},
      create: {
        number: 1,
        title: '회귀한 악역 영애',
        content: `찬가위의 차가운 날이 한서연의 목을 베던 순간이 마지막 기억이었다.

그런데 지금 이 상황은 뭐지?

심장이 두근거리며 떨리는 손으로 주변을 둘러봤다. 분명히 아는 곳이었다. 17살 때까지 살던 자신의 방이 아닌가.

"헉..."

목소리가 나오지 않았다. 아니, 정확히는 17살 때의 그 앳된 목소리가 나왔다.

거울을 보자 그곳엔 스무 살 때 죽었던 자신이 아니라, 아직 철없던 17살의 한서연이 있었다.

'이게... 대체 어떻게?'

손이 떨렸다. 분명히 죽었다. 황태자 이준혁이 차가운 눈빛으로 자신을 내려다보며 사형을 선고했던 그 순간을. 그리고 그 옆에 서서 안도의 한숨을 쉬던 여주인공 민지아의 모습까지.

똑똑.

"아가씨, 일어나셨나요?"

문 밖에서 들리는 목소리에 서연의 심장이 멎을 뻔했다.

유라?

17살 때 자신을 돌봐주던 하녀 유라의 목소리였다. 그녀는 18살 때 병에 걸려 죽었는데...

"아가씨? 오늘 황실 아카데미 입학식이신데요."

서연의 얼굴이 새하얗게 변했다.

황실 아카데미 입학식.

모든 비극이 시작된 그날이었다. 그날 민지아를 처음 만났고, 그날 이준혁에게 첫눈에 반했으며, 그날부터 모든 게 꼬이기 시작했다.

하지만 이번엔 다르다.

이번엔 미래를 알고 있으니까.

서연의 입가에 차가운 미소가 번졌다.

"지아야, 이번엔 내가 이길 거야."`,
        wordCount: 412,
        cliffhanger: '서연의 입가에 차가운 미소가 번졌다.',
        novelId: sampleNovel.id,
      },
    });

    console.log('✅ Sample chapter created:', sampleChapter.title);

    // Create chapter event
    await prisma.chapterEvent.create({
      data: {
        chapterId: sampleChapter.id,
        eventType: 'CHARACTER_INTRODUCTION',
        description: '한서연이 17세로 회귀하며 깨어나는 장면',
        importance: 5,
      },
    });

    console.log('✅ Chapter event created');

    console.log('\n🎉 Demo data initialization complete!');
    console.log('\nYou can now:');
    console.log('1. Visit http://localhost:3000 to see the home page');
    console.log('2. Go to http://localhost:3000/dashboard to view your novels');
    console.log('3. Create new novels and generate chapters');
    console.log('\nHappy writing! 📚✨');

  } catch (error) {
    console.error('❌ Error initializing demo data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

initDemo(); 